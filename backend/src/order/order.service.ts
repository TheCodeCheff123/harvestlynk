import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { OrderStatus } from "generated/prisma";
import { prisma } from "src/db";
import { WalletService } from "../wallet/wallet.service"; // Ensure this is imported

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly walletService: WalletService, // Ensure this is injected
  ) {}

  /**
   * Create a new order for a buyer
   */
  async createOrder(
    buyerId: string,
    data: {
      listing_id: string;
      quantity: number;
      delivery_method: string;
      delivery_address?: string | null;
      special_instructions?: string | null;
    },
  ) {
    const listing = await prisma.listing.findUnique({
      where: { listing_id: data.listing_id },
    });

    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.status !== "active") {
      throw new BadRequestException("This listing is no longer available");
    }

    const totalAmount = Math.round(Number(data.quantity) * listing.price_per_unit);

    return prisma.order.create({
      data: {
        listing_id: data.listing_id,
        farmer_id: listing.farmer_id,
        buyer_id: buyerId,
        quantity: data.quantity,
        unit_price: listing.price_per_unit,
        total_amount: totalAmount,
        delivery_method: data.delivery_method,
        delivery_address: data.delivery_address ?? null,
        special_instructions: data.special_instructions ?? null,
        status: "pending_payment",
      },
      include: {
        listing: { select: { product_name: true, unit: true } },
        farmer: { select: { name: true, farmName: true } },
      },
    });
  }

  /**
   * Fetch all orders where the current user is the buyer
   */
  async getMyBuyerOrders(buyerId: string) {
    return prisma.order.findMany({
      where: { buyer_id: buyerId },
      orderBy: { created_at: "desc" },
      include: {
        listing: { select: { product_name: true, unit: true } },
        farmer: { select: { name: true, farmName: true } },
      },
    });
  }

  /**
   * Fetch all orders where the current user is the farmer
   */
  async getMyFarmerOrders(farmerId: string) {
    return prisma.order.findMany({
      where: { farmer_id: farmerId },
      orderBy: { created_at: "desc" },
      include: {
        listing: { select: { product_name: true, unit: true } },
        buyer: { select: { name: true } },
      },
    });
  }

  /**
   * 1. Existing Webhook Method: Transition order to processing once paid
   */
  async markAsPaid(orderId: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { order_id: orderId },
      });

      if (!order) {
        this.logger.error(`Order link failed: Order ${orderId} not found.`);
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (
        order.status === OrderStatus.processing ||
        order.status === OrderStatus.completed
      ) {
        return order;
      }

      if (order.status !== OrderStatus.pending_payment) {
        throw new BadRequestException(
          `Cannot mark order in ${order.status} state as PAID`,
        );
      }

      return await tx.order.update({
        where: { order_id: orderId },
        data: {
          status: OrderStatus.processing,
          updated_at: new Date(),
        },
      });
    });
  }

  /**
   * 2. New Delivery Method: Triggered by the buyer to release escrow funds to the farmer
   */
  async confirmDelivery(orderId: string, buyerId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the order details
      const order = await tx.order.findUnique({
        where: { order_id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // 2. Security validation
      if (order.buyer_id !== buyerId) {
        throw new ForbiddenException(
          "You are not authorized to confirm delivery for this order",
        );
      }

      // 3. Status validation
      if (order.status === OrderStatus.completed) {
        throw new BadRequestException("Order is already completed and settled");
      }

      // 4. Update order status to completed
      const updatedOrder = await tx.order.update({
        where: { order_id: orderId },
        data: {
          status: OrderStatus.completed,
          completed_at: new Date(),
        },
      });

      // 5. Release escrow funds directly to the farmer's balance
      await this.walletService.releaseEscrowFunds(
        order.farmer_id,
        order.total_amount,
        order.order_id,
      );

      return {
        message:
          "Delivery confirmed successfully. Funds released to the farmer.",
        order: updatedOrder,
      };
    });
  }
}
