export default function asyncHandler(handler) {
  if (typeof handler !== "function") {
    throw new TypeError(
      "asyncHandler expects a function."
    );
  }

  return async function wrappedHandler(req, res, next) {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      next(error);
    }
  };
}