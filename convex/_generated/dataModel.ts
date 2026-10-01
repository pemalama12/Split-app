import type { GenericId } from "convex/values";

export type Id<TableName extends string> = GenericId<TableName>;
export type Doc<TableName extends string> = { _id: Id<TableName>; _creationTime: number } & Record<string, unknown>;
export type DataModel = Record<string, never>;
