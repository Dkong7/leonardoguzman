/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hb24iuk39b4x7j6")

  collection.viewRule = ""

  // remove
  collection.schema.removeField("42mmt5au")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dwzjyl1d",
    "name": "enlaces",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hb24iuk39b4x7j6")

  collection.viewRule = null

  // add
  collection.schema.addField(new SchemaField({
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
  }))

  // remove
  collection.schema.removeField("dwzjyl1d")

  return dao.saveCollection(collection)
})
