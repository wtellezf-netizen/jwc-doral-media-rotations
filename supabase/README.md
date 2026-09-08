# JWC Doral · Supabase setup

The migration in `migrations/20260906000000_jwc_media_rotations.sql` creates the scheduling model, public read policies, and editor/admin policies.

Required bootstrap after the Supabase project is connected:

1. Create the three Auth users for Wilson Tellez, Frankie, and Adiel.
2. Insert one matching row per user in `public.profiles` using the Auth UUID.
3. Set Wilson's role to `admin`; set Frankie and Adiel's role to `editor`.
4. Seed the camera positions and the teams from the project brief.
5. Enable the notification provider chosen by the team (email first, then WhatsApp if desired).

The front-end currently includes the seeded JWC teams as an interactive first slice. Once the project URL and anon key are provided, the next pass should replace the in-memory seed with Supabase reads/writes and wire the authentication flow to these policies.
