// Sameday API mock for LOCAL QA ONLY (never used in production).
// Implements the endpoints/formats of the official sameday-courier/php-sdk.
// Run: node integration-tests/mocks/sameday-mock.mjs, then start Medusa with
// SAMEDAY_API_HOST=http://localhost:4010 and save Sameday credentials demo/demo.
import http from "http"
const log = (...a) => console.log(new Date().toISOString(), ...a)
http.createServer((req, res) => {
  let body = ""
  req.on("data", (c) => (body += c))
  req.on("end", () => {
    const url = new URL(req.url, "http://x")
    log(req.method, url.pathname, url.search, decodeURIComponent(body).slice(0, 600), "token=" + (req.headers["x-auth-token"] || "-"))
    const json = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)) }
    if (url.pathname === "/api/authenticate") {
      if (req.headers["x-auth-username"] !== "demo" || req.headers["x-auth-password"] !== "demo") return json(403, { message: "Bad credentials" })
      return json(200, { token: "mock-token", expire_at: "2099-01-01 10:00" })
    }
    if (req.headers["x-auth-token"] !== "mock-token") return json(401, { message: "Unauthorized" })
    if (url.pathname === "/api/client/services") return json(200, { data: [{ id: 7, name: "24H", serviceCode: "24", deliveryType: { id: 1, name: "Standard" } }, { id: 15, name: "Locker NextDay", serviceCode: "LN", deliveryType: { id: 1, name: "Locker" } }], pages: 1 })
    if (url.pathname === "/api/client/pickup-points") return json(200, { data: [{ id: 101, alias: "Depozit", address: "Str. Test 1", defaultPickupPoint: true, pickupPointContactPerson: [{ id: 555, name: "Ion", phoneNumber: "0700000000", defaultContactPerson: true }] }], pages: 1 })
    if (url.pathname === "/api/client/lockers") return json(200, { data: [{ lockerId: 1203, name: "easybox Kaufland Mărăști", county: "Cluj", city: "Cluj-Napoca", address: "Strada Aurel Vlaicu 3", postalCode: "400582", lat: 46.7784, lng: 23.6166, schedule: [], availableBoxes: [] }, { lockerId: 2011, name: "easybox Profi Gheorgheni", county: "Cluj", city: "Cluj-Napoca", address: "Strada Albac 12", postalCode: "400459", lat: 46.764, lng: 23.629, schedule: [], availableBoxes: [] }], pages: 1 })
    if (url.pathname === "/api/awb" && req.method === "POST") return json(200, { awbNumber: "1ONBLN0000001", awbCost: 14.5, parcels: [{ position: 1, awbNumber: "1ONBLN0000001001" }] })
    if (url.pathname.startsWith("/api/awb/download/")) { res.writeHead(200, { "Content-Type": "application/pdf" }); return res.end("%PDF-1.4 mock label") }
    if (url.pathname.startsWith("/api/awb/") && req.method === "DELETE") return json(200, {})
    if (url.pathname.match(/\/api\/client\/awb\/.+\/status/)) return json(200, { expeditionSummary: { delivered: false, canceled: false, awbNumber: "1ONBLN0000001" }, expeditionHistory: [{ statusId: 4, status: "In tranzit", statusLabel: "Coletul este în tranzit", statusState: "In tranzit", statusDate: "2026-09-27T12:00:00+03:00", county: "Cluj", reason: "" }], expeditionStatus: { statusId: 4, status: "In tranzit", statusLabel: "Coletul este în tranzit", statusState: "In tranzit", statusDate: "2026-09-27T12:00:00+03:00" } })
    json(404, { message: "not mocked" })
  })
}).listen(4010, () => log("sameday mock on :4010"))
