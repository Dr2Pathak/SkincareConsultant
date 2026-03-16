/**
 * Load knowledge graph from scripts/out/graph.cypher into Neo4j.
 * Run from repo root. Loads env from skincareconsultant/.env.local if present.
 * Example: npm run load-graph
 */

import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"
import neo4j from "neo4j-driver"

config({ path: path.join(__dirname, "..", "skincareconsultant", ".env.local") })

const cypherPath = path.join(__dirname, "out", "graph.cypher")

function main() {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD
  if (!uri || !user || !password) {
    console.error("Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD")
    process.exit(1)
  }

  if (!fs.existsSync(cypherPath)) {
    console.error("Run npm run combine-datasets first to generate scripts/out/graph.cypher")
    process.exit(1)
  }

  const content = fs.readFileSync(cypherPath, "utf-8")
  const statements = content
    .split("\n")
    .map((line) => line.replace(/^\s*\/\/.*$/, "").trim())
    .filter((line) => line.length > 0 && line.endsWith(";"))
    .map((line) => line.replace(/;\s*$/, ""))

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

  async function run() {
    const session = driver.session()
    try {
      for (let i = 0; i < statements.length; i++) {
        await session.run(statements[i])
        if ((i + 1) % 50 === 0) console.log(`Executed ${i + 1}/${statements.length}`)
      }
      console.log(`Done. Executed ${statements.length} statements.`)
    } finally {
      await session.close()
      await driver.close()
    }
  }

  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

main()
