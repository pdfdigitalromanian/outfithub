import { validateLockerSelection } from "../shipping/validate-locker"

const setup = (locker: unknown) => {
  const req: any = {
    body: { option_id: "option", data: { locker_id: "123", locker_name: "forged" } },
    validatedBody: { data: {} },
    scope: { resolve: (key: string) => key === "fulfillment" ? { retrieveShippingOption: async () => ({ data: { id: "sameday-easybox" } }) } : {
      resolveIntegration: async () => ({ enabled: true, status: "connected" }),
      listSamedayLockers: async () => locker ? [locker] : [],
    } },
  }
  return req
}

describe("canonical Easybox selection", () => {
  it("replaces customer-supplied labels with the courier record", async () => {
    const req = setup({ locker_id: "123", name: "Easybox Centru", city: "Cluj", address: "Strada 1" })
    const next = jest.fn()
    await validateLockerSelection(req, {} as any, next)
    expect(req.validatedBody.data.locker_name).toBe("Easybox Centru")
    expect(req.body.data).toEqual(req.validatedBody.data)
    expect(next).toHaveBeenCalledWith()
  })
  it("rejects a removed or invented locker", async () => {
    const next = jest.fn()
    await validateLockerSelection(setup(null), {} as any, next)
    expect(next.mock.calls[0][0]).toMatchObject({ type: "invalid_data" })
  })
})
