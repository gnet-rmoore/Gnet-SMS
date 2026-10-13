import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3010;

app.listen(PORT, () => {
  console.log(`[lifecycle] listening on :${PORT}`);
});
