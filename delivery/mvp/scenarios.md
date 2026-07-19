# MVP User Scenarios

| ID | Promises | Actor | Intent | Success |
|---|---|---|---|---|
| SC-FIRST-USE | `CP-QUICK-START` | Jamie, a time-constrained solo developer | Create the first useful character | A named project opens with a rendered starter character |
| SC-COMPOSE | `CP-QUICK-START`, `CP-CREATIVE-CONTROL` | Jamie | Change appearance by slot | Compatible choices are reflected in the preview and recipe |
| SC-THEME | `CP-CREATIVE-CONTROL` | Sam, a solo indie developer | Match a project palette and personalize one character | Project tokens and character override visibly resolve |
| SC-PREVIEW | `CP-CREATIVE-CONTROL` | Sam | Judge supported motion before export | Idle and walk play in every direction at chosen speed and zoom |
| SC-RETURN | `CP-REPRODUCIBLE-WORK` | Returning developer | Continue without reconstructing work | The complete recipe and identical preview restore |
| SC-GENERIC-EXPORT | `CP-GAME-READY-DELIVERY`, `CP-LEGAL-CONFIDENCE` | Developer using generic sprite tooling | Download portable game assets | ZIP contains PNG, animation JSON, manifest, and credits |
| SC-GODOT-EXPORT | `CP-GAME-READY-DELIVERY`, `CP-LEGAL-CONFIDENCE` | Godot 4 developer | Use the character without manual slicing | ZIP imports into the fixture with named animations and frame regions |
| SC-CREDITS | `CP-LEGAL-CONFIDENCE` | Developer preparing a release | Understand and retain attribution | Selected sources and merged obligations are visible and exported |
| SC-RECOVERY | `CP-REPRODUCIBLE-WORK`, `CP-GAME-READY-DELIVERY` | Developer encountering incomplete or invalid state | Return to a safe usable state | No invalid export occurs and an actionable recovery completes |
| SC-SECOND-PACK | `CP-CREATIVE-CONTROL`, `CP-LEGAL-CONFIDENCE` | Developer seeking another visual set | Use another pack through the same workflow | Pack changes, compatible defaults load, and provenance/export update without a different workflow |

## SC-FIRST-USE

- **Promises:** `CP-QUICK-START`
- **Actor:** Jamie, a time-constrained solo developer
- **Starting state:** No local Sprite Project data
- **Intent:** Create the first useful character
- **Environment:** Desktop browser
- **Success:** A named project opens with a rendered starter character
- **Interruptions and branches:** Cancel project creation; Blank name; Reload before creation
- **Status:** verified

## SC-COMPOSE

- **Promises:** `CP-QUICK-START`, `CP-CREATIVE-CONTROL`
- **Actor:** Jamie
- **Starting state:** Open project with starter recipe
- **Intent:** Change appearance by slot
- **Environment:** Desktop or tablet browser
- **Success:** Compatible choices are reflected in the preview and recipe
- **Interruptions and branches:** Clear optional slot; Replace a selected asset; Unavailable animation coverage
- **Status:** verified

## SC-THEME

- **Promises:** `CP-CREATIVE-CONTROL`
- **Actor:** Sam, a solo indie developer
- **Starting state:** Composed character
- **Intent:** Match a project palette and personalize one character
- **Environment:** Desktop browser
- **Success:** Project tokens and character override visibly resolve
- **Interruptions and branches:** Invalid color entry; Reset override; Restore preset
- **Status:** verified

## SC-PREVIEW

- **Promises:** `CP-CREATIVE-CONTROL`
- **Actor:** Sam
- **Starting state:** Composed and themed character
- **Intent:** Judge supported motion before export
- **Environment:** Desktop, tablet, or narrow browser
- **Success:** Idle and walk play in every direction at chosen speed and zoom
- **Interruptions and branches:** Pause; Change direction; Reduced motion preference
- **Status:** verified

## SC-RETURN

- **Promises:** `CP-REPRODUCIBLE-WORK`
- **Actor:** Returning developer
- **Starting state:** Previously saved local project
- **Intent:** Continue without reconstructing work
- **Environment:** Same browser and origin
- **Success:** The complete recipe and identical preview restore
- **Interruptions and branches:** Reload; Open another local project; Rename project
- **Status:** verified

## SC-GENERIC-EXPORT

- **Promises:** `CP-GAME-READY-DELIVERY`, `CP-LEGAL-CONFIDENCE`
- **Actor:** Developer using generic sprite tooling
- **Starting state:** Export-ready character
- **Intent:** Download portable game assets
- **Environment:** Browser with download support
- **Success:** ZIP contains PNG, animation JSON, manifest, and credits
- **Interruptions and branches:** Missing required slot; Repeated export
- **Status:** verified

## SC-GODOT-EXPORT

- **Promises:** `CP-GAME-READY-DELIVERY`, `CP-LEGAL-CONFIDENCE`
- **Actor:** Godot 4 developer
- **Starting state:** Export-ready character
- **Intent:** Use the character without manual slicing
- **Environment:** Browser plus Godot 4 project
- **Success:** ZIP imports into the fixture with named animations and frame regions
- **Interruptions and branches:** Missing required slot; Inspect package before import
- **Status:** verified

## SC-CREDITS

- **Promises:** `CP-LEGAL-CONFIDENCE`
- **Actor:** Developer preparing a release
- **Starting state:** Character uses several source layers
- **Intent:** Understand and retain attribution
- **Environment:** Compose and Export views
- **Success:** Selected sources and merged obligations are visible and exported
- **Interruptions and branches:** Replace one credited layer; Switch packs
- **Status:** verified

## SC-RECOVERY

- **Promises:** `CP-REPRODUCIBLE-WORK`, `CP-GAME-READY-DELIVERY`
- **Actor:** Developer encountering incomplete or invalid state
- **Starting state:** Missing required layer or unreadable saved record
- **Intent:** Return to a safe usable state
- **Environment:** Browser
- **Success:** No invalid export occurs and an actionable recovery completes
- **Interruptions and branches:** Dismiss warning; Reset starter recipe
- **Status:** verified

## SC-SECOND-PACK

- **Promises:** `CP-CREATIVE-CONTROL`, `CP-LEGAL-CONFIDENCE`
- **Actor:** Developer seeking another visual set
- **Starting state:** Open character using starter pack
- **Intent:** Use another pack through the same workflow
- **Environment:** Compose view
- **Success:** Pack changes, compatible defaults load, and provenance/export update without a different workflow
- **Interruptions and branches:** Pack switch replaces incompatible selections; Return to starter pack
- **Status:** verified
