import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3013;

app.listen(PORT, () => {
  console.log(`[staff] listening on :${PORT}`);
});
