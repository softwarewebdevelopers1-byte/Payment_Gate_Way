import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import DotEnv from "../DotEnv.js";
dotenv.config({ path: path.resolve(`${process.cwd()}`, ".env") });

function DbConnect() {
  const DbUrl: string = DotEnv().DatabaseUrl;
  mongoose
    .connect(DbUrl)
    .then(() => console.log("Database connected"))
    .catch((e: any) => {
      console.error("Unable to connect to database", e);
      process.exit(0);
    });
}
export default DbConnect;
