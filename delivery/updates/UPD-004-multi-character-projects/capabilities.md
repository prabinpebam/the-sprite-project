# UPD-004 User-Can Catalog

| ID | Host | User can statement | Scenarios | Status |
|---|---|---|---|---|
| UC-CHARACTER-LIST | shared | User can inspect every character and the active target. | `SC-CHARACTER-CREATE`, `SC-CHARACTER-SWITCH-EDIT` | implemented |
| UC-CHARACTER-CREATE | shared | User can create a named character from active pack defaults. | `SC-CHARACTER-CREATE` | implemented |
| UC-CHARACTER-SWITCH | shared | User can make a listed character active. | `SC-CHARACTER-SWITCH-EDIT` | implemented |
| UC-CHARACTER-EDIT | shared | User can edit only the active character recipe. | `SC-CHARACTER-SWITCH-EDIT` | implemented |
| UC-CHARACTER-DUPLICATE | shared | User can duplicate a character under a new identity. | `SC-CHARACTER-MANAGE` | implemented |
| UC-CHARACTER-RENAME | shared | User can rename one character without changing its ID or content. | `SC-CHARACTER-MANAGE` | implemented |
| UC-CHARACTER-DELETE | shared | User can delete a non-sole character after confirmation. | `SC-CHARACTER-MANAGE` | implemented |
| UC-CHARACTER-SAVE | shared | User can save separate recipe records in one atomic project revision. | `SC-CHARACTER-RETURN`, `SC-CHARACTER-DESKTOP` | implemented |
| UC-CHARACTER-RESTORE | shared | User can restore a removed or changed character from a project snapshot. | `SC-CHARACTER-MANAGE`, `SC-CHARACTER-RETURN` | implemented |
| UC-CHARACTER-EXPORT-ACTIVE | shared | User can export the explicitly active character. | `SC-CHARACTER-SWITCH-EDIT`, `SC-CHARACTER-CROSS-HOST` | implemented |
| UC-CHARACTER-TRANSFER | cross-host | User can transfer every recipe and optional terrain in one project archive. | `SC-CHARACTER-CROSS-HOST` | implemented |
| UC-CHARACTER-OFFLINE | web | User can manage and save the collection offline after installation. | `SC-CHARACTER-RETURN` | implemented |
