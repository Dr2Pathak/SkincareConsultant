/**
 * Neo4j server-only client. Use in API routes to query the knowledge graph.
 */

import neo4j, { type Driver } from "neo4j-driver"

let _driver: Driver | null = null

export function getNeo4jDriver(): Driver {
  if (_driver) return _driver
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD
  if (!uri || !user || !password) {
    throw new Error("Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD")
  }

  let connectUri = uri
  const driverConfig: { encrypted?: boolean; trust?: "TRUST_ALL_CERTIFICATES" } = {}
  if (process.env.NEO4J_TRUST_ALL === "1") {
    connectUri = uri.replace(/^neo4j\+s:/i, "neo4j:").replace(/^bolt\+s:/i, "bolt:")
    driverConfig.encrypted = true
    driverConfig.trust = "TRUST_ALL_CERTIFICATES"
  }

  _driver = neo4j.driver(connectUri, neo4j.auth.basic(user, password), driverConfig)
  return _driver
}

export async function closeNeo4j(): Promise<void> {
  if (_driver) {
    await _driver.close()
    _driver = null
  }
}
