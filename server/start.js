import app from "./server.js";
import { validateEnvironment } from "../utils/envValidation.js";
import { validateProfileFiles } from "../utils/fileLoader.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    validateEnvironment();
    validateProfileFiles();

    app.listen(PORT, () => {
      console.log(`✅ SwapOpt AI API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("\n❌ Failed to start SwapOpt AI\n");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();