import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useConnectionStore, type Connection } from "../connection";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("../storage", () => ({
  loadConnections: vi.fn().mockResolvedValue(null),
  saveConnections: vi.fn().mockResolvedValue(undefined),
  loadActiveConnectionId: vi.fn().mockResolvedValue(null),
  saveActiveConnectionId: vi.fn().mockResolvedValue(undefined),
  loadRecentConnectionIds: vi.fn().mockResolvedValue(null),
  saveRecentConnectionIds: vi.fn().mockResolvedValue(undefined),
}));

describe("connection store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
  });

  it("initializes with default MySQL connection configuration including SSL mode", async () => {
    const store = useConnectionStore();
    await store.load();
    expect(store.connections).toHaveLength(1);
    const conn = store.connections[0];
    expect(conn.name).toBe("Local DB");
    expect(conn.dbType).toBe("mysql");
    expect(conn.sslMode).toBe("preferred");
    expect(conn.connectTimeoutSecs).toBe(10);
    expect(conn.charset).toBe("utf8mb4");
  });

  it("addConnection adds a connection with SSL mode options", async () => {
    const store = useConnectionStore();
    await store.load();
    const id = await store.addConnection({
      name: "Prod Cloud DB",
      host: "db.aws.com",
      port: 3306,
      database: "production",
      username: "admin",
      password: "secretpassword",
      dbType: "mysql",
      ssl: true,
      sslMode: "required",
      connectTimeoutSecs: 15,
      charset: "utf8mb4",
      readOnly: true,
      sshTunnel: false,
      color: "#EF4444",
    });

    expect(store.connections).toHaveLength(2);
    const added = store.connections.find((c) => c.id === id);
    expect(added).toBeDefined();
    expect(added?.sslMode).toBe("required");
    expect(added?.readOnly).toBe(true);
    expect(added?.connectTimeoutSecs).toBe(15);
  });

  it("updateConnection modifies existing connection fields", async () => {
    const store = useConnectionStore();
    await store.load();
    const connId = store.connections[0].id;
    await store.updateConnection(connId, {
      sslMode: "verify_ca",
      readOnly: true,
    });

    expect(store.connections[0].sslMode).toBe("verify_ca");
    expect(store.connections[0].readOnly).toBe(true);
  });

  it("testConnection invokes backend with connection options", async () => {
    mockInvoke.mockResolvedValue(12);
    const store = useConnectionStore();
    const result = await store.testConnection({
      host: "localhost",
      username: "root",
      port: 3306,
      dbType: "mysql",
      sslMode: "required",
    });

    expect(result.ok).toBe(true);
    expect(result.latency).toBe(12);
    expect(mockInvoke).toHaveBeenCalledWith("test_connection", {
      config: expect.objectContaining({
        host: "localhost",
        username: "root",
        sslMode: "required",
      }),
    });
  });

  it("validateConnection rejects invalid host or port", async () => {
    const store = useConnectionStore();
    const res1 = await store.testConnection({ host: "", username: "root", port: 3306, dbType: "mysql" });
    expect(res1.ok).toBe(false);
    expect(res1.error).toContain("Host is required");

    const res2 = await store.testConnection({ host: "localhost", username: "root", port: 99999, dbType: "mysql" });
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain("Port must be between");
  });

  it("connect disconnects previous active connection when switching", async () => {
    mockInvoke.mockResolvedValue("ok");
    const store = useConnectionStore();
    await store.load();
    const conn1Id = store.connections[0].id;
    const conn2Id = await store.addConnection({
      name: "Second DB",
      host: "localhost",
      port: 3306,
      database: "second",
      username: "root",
      password: "",
      dbType: "mysql",
      ssl: false,
    });

    await store.connect(conn1Id);
    expect(store.activeId).toBe(conn1Id);

    // Switch to conn2
    await store.connect(conn2Id);
    expect(mockInvoke).toHaveBeenCalledWith("disconnect", { id: conn1Id });
    expect(mockInvoke).toHaveBeenCalledWith("connect", expect.objectContaining({ id: conn2Id }));
    expect(store.activeId).toBe(conn2Id);
  });
});
