const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function create(req, res, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  const order = res.locals.order;
  const { orderId } = req.params; // Get the orderId from route parameters
  const { data: { deliverTo, mobileNumber, dishes, status } = {} } = req.body;

  if (order.id !== orderId) {
    return next({
      status: 400,
      message: `Order ID in the request body (${data.id}) does not match the route parameter (${orderId})`,
    });
  }

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;
  order.status = status; // Update the order status

  res.json({ data: order });
}

function remove(req, res, next) {
  const index = orders.indexOf(res.locals.order);
  orders.splice(index, 1);
  res.sendStatus(204);
}

function list(req, res) {
  res.json({ data: orders });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order with id ${orderId} not found`,
  });
}

function hasValidProperties(req, res, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  for (const field of requiredFields) {
    if (!req.body.data[field]) {
      return next({
        status: 400,
        message: `Order must include a ${field}`,
      });
    }
  }

  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }

  for (const [index, dish] of dishes.entries()) {
    if (
      !dish.quantity ||
      typeof dish.quantity !== "number" ||
      dish.quantity <= 0
    ) {
      return next({
        status: 400,
        message: `Dish at index ${index} must have a valid quantity as a positive integer`,
      });
    }
  }

  next();
}

function canBeUpdated(req, res, next) {
  const order = res.locals.order;
  if (order.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be updated unless it is pending",
    });
  }

  if (!req.body.data.status) {
    return next({
      status: 400,
      message: "Order must have a status",
    });
  }

  const validStatuses = [
    "pending",
    "preparing",
    "out-for-delivery",
    "delivered",
  ];
  if (!validStatuses.includes(req.body.data.status)) {
    return next({
      status: 400,
      message: "Order status is invalid",
    });
  }

  next();
}

function hasValidId(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;

  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }

  next();
}

//for delete only
function isStatusPending(req, res, next) {
  const order = res.locals.order.status;
  if (order && order !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be updated unless it is pending",
    });
  }
  next();
}

module.exports = {
  create: [hasValidProperties, create],
  read: [orderExists, read],
  update: [orderExists, hasValidId, hasValidProperties, canBeUpdated, update],
  remove: [orderExists, isStatusPending, remove],
  list,
};
