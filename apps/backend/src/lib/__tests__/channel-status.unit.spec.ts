import { refreshChannelStatuses } from "../channels/status-refresh"
import { MetaClient } from "../providers/meta"

function setup(action = "upsert") {
  const service = {
    resolveIntegration: async (provider: string) => provider === "meta" ? { enabled: true, status: "connected", secrets: { access_token: "test" }, config: { catalog_id: "catalog" } } : { enabled: false },
    listChannelSyncs: jest.fn(async () => [{ id: "sync", action, external_data: { batch_handles: ["batch"] } }]),
    updateChannelSyncs: jest.fn(),
  }
  const container: any = { resolve: (name: string) => name === "logger" ? { warn: jest.fn() } : service }
  return { service, container }
}

describe("Meta asynchronous catalog status", () => {
  afterEach(() => jest.restoreAllMocks())
  it("does not report success for an unfinished batch", async () => {
    jest.spyOn(MetaClient.prototype, "checkBatch").mockResolvedValue({ data: [{ status: "in_progress" }] })
    const { service, container } = setup()
    await refreshChannelStatuses(container)
    expect(service.updateChannelSyncs).not.toHaveBeenCalled()
  })
  it.each([["upsert", "synced"], ["delete", "removed"]])("records confirmed %s as %s", async (action, status) => {
    jest.spyOn(MetaClient.prototype, "checkBatch").mockResolvedValue({ data: [{ status: "finished" }] })
    const { service, container } = setup(action)
    await refreshChannelStatuses(container)
    expect(service.updateChannelSyncs).toHaveBeenCalledWith(expect.objectContaining({ status, last_error: null }))
  })
  it("reports item rejection as an error", async () => {
    jest.spyOn(MetaClient.prototype, "checkBatch").mockResolvedValue({ data: [{ status: "finished", errors: [{ message: "Invalid image" }] }] })
    const { service, container } = setup()
    await refreshChannelStatuses(container)
    expect(service.updateChannelSyncs).toHaveBeenCalledWith(expect.objectContaining({ status: "error", last_error: "Meta catalog: Invalid image" }))
  })
})
