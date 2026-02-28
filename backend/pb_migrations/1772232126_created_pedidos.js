/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "3zosyufggqpkitx",
    "created": "2026-02-27 22:42:06.160Z",
    "updated": "2026-02-27 22:42:06.160Z",
    "name": "pedidos",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "yrukhgi6",
        "name": "cliente_nombre",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "bugjeicl",
        "name": "cliente_email",
        "type": "email",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "ourzbxy7",
        "name": "cliente_telefono",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "bsfk2zat",
        "name": "direccion",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "de9gu8q0",
        "name": "tipo_pedido",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "digital",
            "fisico",
            "mixto"
          ]
        }
      },
      {
        "system": false,
        "id": "9wjewx0n",
        "name": "total_usd",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "xr1vo4gi",
        "name": "total_cop",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "4qwskojs",
        "name": "estado",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pagado",
            "enviado",
            "entregado"
          ]
        }
      },
      {
        "system": false,
        "id": "c9idzuau",
        "name": "items",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
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
  const collection = dao.findCollectionByNameOrId("3zosyufggqpkitx");

  return dao.deleteCollection(collection);
})
