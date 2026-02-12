# Home Configuration - Points Export

This document exports the current default point configuration for Home Configuration.

- Source baseline: `src/views/Setting/HomeConfiguration/HomeView/index.vue` and `src/views/Setting/HomeConfiguration/index.vue`
- Name uses current page display defaults
- `formula` and `descript` are empty by default unless user saves custom values in dialog

## Export Table

| Id | Name | formula | imgurl | unit | descript |
|---:|---|---|---|---|---|
| 1 | PV Energy | `-` | `icon-pv-energy` | `kWh` | `-` |
| 2 | Diesel Energy | `-` | ``icon-diesel-energy` | `KWh` | `-` |
| 3 | Energy Used | `-` | ``icon-energy-used` | `kWh` | `-` |
| 4 | Saving Billing | `-` | `icon-saving-billing` | `$` |`-`|
| 5 | PV | `-` | `icon-pv-energy` | `kW` | `-` |
| 6 | Diesel | `-` | `icon-diesel-energy` | `kW` | `-` |
| 7 | ESS | `-` | `icon-ess-energy` | `KWh` | `-` |
| 8 | P | `-` | `-` | `KW` | `-` |
| 9 | U | `-` | `-` |`V`|`-`|
| 10 | P | `-` | `-` | `KW` | `-` |
| 11 | U | `-` | `-` | `V` | `-` |
| 12 | P | `-` | `-` | `KW` | `-` |
| 13 | U | `-` | `-` | `V` | `-` |
| 14 | P | `-` | `-` | `kw` | `-` |
| 15 | P | `-` | `-` | `kw` | `-` |
| 16 | P | `-` | `-` | `kw` | `-` |
| 17 | Oil | `-` | `-` | `%` | `-` |
| 18 | P | `-` | `-` | `kw` | `-` |
| 19 | SOC | `-` | `-` | `%` | `-` |

## Notes

- The exported `formula`/`descript` values are `-` because defaults are empty in current code.
- If you save custom values in `PointConfigDialog`, those values are stored in runtime `pointConfigs` and can be exported as actual non-empty values in a future dynamic export.
