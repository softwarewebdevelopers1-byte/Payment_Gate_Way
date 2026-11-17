import mongoose, { Schema, Document } from "mongoose";

export interface IClientCredential extends Document {
  clientId: string; // Public identifier (passed in X-Client-Id header)
  clientSecret: string; // Secret key used for HMAC-SHA256 signing
  serviceName: string; // e.g., "Hostelix", "Lernesis"
  isActive: boolean; // Ability to instantly revoke access if compromised
  createdAt: Date;
  updatedAt: Date;
}

const ClientCredentialSchema = new Schema<IClientCredential>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const ClientCredential = mongoose.model<IClientCredential>(
  "ClientCredential",
  ClientCredentialSchema,
);

export default ClientCredential;
