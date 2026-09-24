# Personal appearance and shared team branding

## Goal
Give each signed-in scout a personal **Light / Dark / System** appearance choice while applying one shared team identity—name, logo, primary color, and secondary color—across the scouting workspace and branded reports.

## Experience

### Account settings
Split the existing Appearance area into two clear sections:

1. **My appearance**
   - Segmented control for Light, Dark, or System.
   - Preview changes immediately.
   - Save the choice per scout so it follows them across devices.
   - Keep all text, cards, menus, charts, dialogs, and status colors legible in both modes.

2. **Team branding**
   - Team name.
   - Logo upload with preview, replace, and remove actions.
   - Primary and secondary color pickers with accessible contrast previews.
   - Save/reset controls.
   - Only the team owner or an authorized admin can edit branding; other scouts see the active brand read-only.

### Where branding appears
- Replace the clipboard icon with the team logo in the signed-in header, retaining BarnNotes/team-name fallback when no logo exists.
- Apply team colors to primary actions, active navigation, highlights, report headings, and restrained accents; light/dark surfaces remain the scout’s personal choice.
- Show team branding on the login screen when the team is known from an invite/branded entry or the scout’s last-used team. A first-time generic login keeps the BarnNotes fallback because no team is identifiable before sign-in.
- Add a branded, print-friendly player scouting report that can be saved as PDF from the browser. Keep CSV as raw portable data; add team name/colors to Excel exports where practical, while the printable report carries the logo.

## Shared team foundation
The project currently has no organization membership model, so add the minimum secure structure required for genuinely shared branding:

- Create organizations, organization memberships/roles, and organization branding records.
- Create a default organization for each existing scout without changing ownership of players, viewings, or media in this feature.
- Provide a minimal team settings view for the owner to see membership and invite another scout, so shared branding can actually reach multiple accounts.
- Validate owner/admin permissions in the database; never trust a role sent by the browser.
- Add scoped access rules and explicit grants for every new table.

## Logo storage
- Add a dedicated branding storage bucket.
- Accept PNG, JPEG, or WebP with a clear size limit.
- Store logos under organization-specific paths.
- Restrict upload, replacement, and deletion to authorized team owners/admins.
- Use stable public delivery for the non-sensitive logo so branded login pages and reports can display it before authentication.

## Technical approach
- Extend the existing theme preference record with `appearance_mode` rather than storing a second competing preference.
- Define complete semantic light and dark token sets; team primary/secondary colors override only brand roles, not every surface color.
- Add a shared branding provider beside the existing authentication/theme providers, loading the scout’s active organization and applying its brand tokens.
- Update the account editor, signed-in header, login branding, and export/report generation to consume the same branding source.
- Preserve existing custom theme records safely: infer the initial mode from their background and retain a reset path to the BarnNotes defaults.
- Add loading and fallback states so a missing logo, incomplete organization, or failed image never blocks the app.

## Validation
- Verify Light, Dark, and System choices persist across refresh and a second signed-in session.
- Verify two scouts in the same team see the same logo/colors while retaining different light/dark choices.
- Verify a regular member cannot alter branding, including by calling the database directly.
- Verify logo upload, replacement, removal, file validation, and fallback behavior.
- Verify signed-in header, mobile menu, known-team login, printable report/PDF, and exports.
- Check contrast and overflow on desktop and mobile in both modes.

## Scope boundary
This adds only the shared membership needed for branding. It does not yet move player/scouting records to organization ownership, add organization switching, or implement the broader multi-team account refactor.
