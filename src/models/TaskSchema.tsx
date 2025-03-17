import { Realm } from "@realm/react";

export class Note extends Realm.Object {
  static schema = {
    name: "Note",
    properties: {
      id: "string",
      title: "string",
      content: "string",
      category: "string",
      color: "string",
      date: "string",
      isSynced: { type: "bool", default: false }, // Track sync status
    },
    primaryKey: "id",
  };
}
