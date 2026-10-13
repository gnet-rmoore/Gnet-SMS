import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3011;

app.listen(PORT, () => {
  console.log(`[identity] listening on :${PORT}`);
});
