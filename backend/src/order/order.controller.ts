import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { OrderService } from "./order.service";
import {
  BuyerOrderItemSchema,
  BuyerOrdersResponseDto,
  BuyerOrdersResponseSchema,
  ConfirmDeliveryResponseDto,
  ConfirmDeliveryResponseSchema,
  CreateOrderRequestDto,
  CreateOrderRequestSchema,
  FarmerOrdersResponseDto,
  FarmerOrdersResponseSchema,
} from "./order.dto";

@ApiTags("Orders")
@ApiBearerAuth()
@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new order" })
  @ApiBody({ type: CreateOrderRequestDto })
  @ApiResponse({ status: 201, description: "Order created" })
  async createOrder(
    @Session() session: UserSession,
    @Body() body: unknown,
  ) {
    const dto = CreateOrderRequestSchema.parse(body);
    const order = await this.orderService.createOrder(session.user.id, dto);
    const serialized = {
      ...order,
      quantity: order.quantity.toString(),
      completed_at: order.completed_at?.toISOString() ?? null,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
    };
    return BuyerOrderItemSchema.parse(serialized);
  }

  @Get("buyer")
  @ApiOperation({ summary: "Get current buyer's orders" })
  @ApiResponse({ status: 200, type: BuyerOrdersResponseDto })
  async getMyBuyerOrders(@Session() session: UserSession) {
    const orders = await this.orderService.getMyBuyerOrders(session.user.id);
    const serialized = orders.map((o) => ({
      ...o,
      quantity: o.quantity.toString(),
      completed_at: o.completed_at?.toISOString() ?? null,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString(),
    }));
    return BuyerOrdersResponseSchema.parse(serialized);
  }

  @Get("my")
  @ApiOperation({ summary: "Get current farmer's orders" })
  @ApiResponse({
    status: 200,
    description: "Orders retrieved successfully",
    type: FarmerOrdersResponseDto,
  })
  async getMyFarmerOrders(@Session() session: UserSession) {
    const orders = await this.orderService.getMyFarmerOrders(session.user.id);
    const serialized = orders.map((o) => ({
      ...o,
      quantity: o.quantity.toString(),
      completed_at: o.completed_at?.toISOString() ?? null,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString(),
    }));
    return FarmerOrdersResponseSchema.parse(serialized);
  }

  @Patch(":orderId/confirm-delivery")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm order delivery" })
  @ApiParam({
    name: "orderId",
    type: "string",
    description: "Order ID",
  })
  @ApiResponse({
    status: 200,
    description: "Delivery confirmed successfully",
    type: ConfirmDeliveryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Order not found",
  })
  @ApiResponse({
    status: 403,
    description: "Unauthorized - only order recipient can confirm delivery",
  })
  async confirmDelivery(
    @Param("orderId") orderId: string,
    @Session() session: UserSession,
  ) {
    const result = await this.orderService.confirmDelivery(
      orderId,
      session.user.id,
    );
    return ConfirmDeliveryResponseSchema.decode(result);
  }
}
