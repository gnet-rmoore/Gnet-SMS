import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3015;

app.listen(PORT, () => {
  console.log(`[academic] listening on :${PORT}`);
});
