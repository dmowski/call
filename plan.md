# Get ready for the call

We are going to create an app that helps with preparing for the call.

## Functionality:

- See how my camera work
- Hear how my mic working

### See how my camera work

We need an options to switch cameras.

### Hear how my mic working

We need to create something sophisticated to emulate how in real life people will hear you.

Idea is to emulate google call UI where 1 participant (me). But camera and audio shows with delay 2 second. We need to establish webrtc connection with our own. So we will hear our voice with delay how the other partner would hear us.

## Tech details

Selected options should be saved on localhost.
Create it using native css and javascript.
Use modern JS/CSS features.

You can create package json with pnpm to create dev server for enabling hot reload and add command pnpm dev to start dev server. This command should open localhost environment.

Later I want to expand functionality. For example adding tools to prepare speech for the call. But for now simple task is to prepare for the call.

We are going to deploy it on vercel.
Add proper .gitignore and other config files

## Landing

We need to think about SEO.
So on landing page we should add footer with privacy policy and contact page link.
So user can share feedback. No analytic or server side logic.

And we need to give enough info on landing page so the user/AI/Google crowlers can read it and parse.

When user press: "Start" we need to hide landing page and show the app.

## The app

It should list available web cameras and mics and button "Enable camera" "Enable mic".
When user press "Enable camera" - we need to replace webcamera placeholder with real webcamera view (that will came from webrtc). when the user press "Enable mic" - we should start hearing our voice.

### Testing

Please setup proper e2e tests, because we are going to work with native JS I want to ensure we don't break old features while working on new features.
Avoid mocking anything, and user real UI/app.

## UI

Keep it minimalistic. Support color themes.

## Plan

1. Implement basic file structure
2. Add e2e tests
3. Write functionality until e2e pass

At the end of your work, I should have full working, ready to deploy app.
