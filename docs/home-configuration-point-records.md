# Home Configuration - Point Records

This document records all configurable points currently exposed by the **Home Configuration** module.

- **Index starts from 1**
- **Device Information uniqueness rule**: each `(device name + metric)` is a unique point

## Point Table

| No. | Module | Context | ID | Default Label | Default Unit |
|---:|---|---|---|---|---|
| 1 | Energy Dashboard |  | `energy-PV Energy` | PV Energy | kWh |
| 2 | Energy Dashboard |  | `energy-Diesel Energy` | Diesel Energy | KWh |
| 3 | Energy Dashboard |  | `energy-Energy Used` | Energy Used | kWh |
| 4 | Energy Dashboard |  | `energy-Saving Billing` | Saving Billing |  |
| 5 | Station Information |  | `station-PV` | PV | kW |
| 6 | Station Information |  | `station-Diesel` | Diesel | kW |
| 7 | Station Information |  | `station-ESS` | ESS | KWh |
| 8 | Device Information | PV | `device-PV-P` | P | KW |
| 9 | Device Information | PV | `device-PV-U` | U | V |
| 10 | Device Information | Diesel Generator | `device-Diesel Generator-P` | P | KW |
| 11 | Device Information | Diesel Generator | `device-Diesel Generator-U` | U | V |
| 12 | Device Information | ESS | `device-ESS-P` | P | KW |
| 13 | Device Information | ESS | `device-ESS-U` | U | V |
| 14 | Topology | PV | `tuopu-pv-P` | P | kw |
| 15 | Topology | Load | `tuopu-load-P` | P | kw |
| 16 | Topology | Diesel | `tuopu-diesel-P` | P | kw |
| 17 | Topology | Diesel | `tuopu-diesel-Oil` | Oil | % |
| 18 | Topology | ESS | `tuopu-ess-P` | P | kw |
| 19 | Topology | ESS | `tuopu-ess-SOC` | SOC | % |

