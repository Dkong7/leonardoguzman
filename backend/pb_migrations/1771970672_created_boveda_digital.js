/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "hb24iuk39b4x7j6",
    "created": "2026-02-24 22:04:32.238Z",
    "updated": "2026-02-24 22:04:32.238Z",
    "name": "boveda_digital",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "tr3acepa",
        "name": "Producto",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "4k04aakagagvnpw",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "42mmt5au",
        "name": "link_drive",
        "type": "url",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("hb24iuk39b4x7j6");

  return dao.deleteCollection(collection);
})
