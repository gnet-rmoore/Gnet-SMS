import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3018;

app.listen(PORT, () => {
  console.log(`[campus] listening on :${PORT}`);
});
