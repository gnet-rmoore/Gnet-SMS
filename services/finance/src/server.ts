import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3016;

app.listen(PORT, () => {
  console.log(`[finance] listening on :${PORT}`);
});
