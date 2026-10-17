# m.studio.lab for iOS

A native shell (Capacitor) around the live site, so the studio can be tried
as an app on an iPhone or in the Simulator. It loads
https://mstudiolab.vercel.app, so every push to the site shows up in the app
without rebuilding it.

## Open it in Xcode (on a Mac)

```sh
cd mobile
npm install
npx cap sync ios   # writes the app's config and links Capacitor
npx cap open ios   # opens ios/App/App.xcodeproj
```

In Xcode: pick an iPhone simulator at the top and press Run (⌘R).

On your own iPhone: plug it in, choose it at the top, then in
App → Signing & Capabilities tick "Automatically manage signing" and choose
your Apple ID as the Team. The first time, allow the developer on the phone
under Settings → General → VPN & Device Management.

## Notes

- `capacitor.config.json` holds the app's id, name and the site it loads.
  After changing it, run `npx cap sync ios` again.
- `www/offline.html` is what the app shows when the site can't be reached.
- Links in e-mails (password reset, invitations) open in Safari, not the app.
