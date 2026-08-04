# Join the Community — Official and Pilot Release

## Product direction

**Your Campus. Your Community. Your Voice.**

Join the Community extends My CCSF from a reporting and safety platform into a controlled student-community ecosystem while preserving the existing Safety, Report, Support, Alerts, Profile and emergency workflows.

## Shared student experience

The same `CommunityHub` design system is used in:

- the official student dashboard with `environment="official"`
- the Pilot student dashboard with `environment="pilot"`

Both environments provide:

- Community Games
- Sports and Tournaments
- Join student roles and volunteering
- Blogs and Media
- My Participation
- points, badges and leaderboard privacy
- My CCSF onboarding gates

The visual treatment uses the existing TUT navy, CCSF red, CPS/TUT gold, white and neutral interface tokens. Existing shared branding components are retained; no replacement or generated institutional marks are introduced.

## Community Games

The initial activity catalogue includes:

- Campus Treasure Hunt
- Spot the Building
- Campus Safety Quiz
- Safety Scenario Challenge
- Campus Check-In Challenge
- Community Missions

The existing Safety Quest remains the official quiz engine. The official Community tab routes to `/safety-quest`; Pilot routes to `/pilot/safety-quest`.

## Sports

Soccer and netball are the initial tournament types.

A team is compliant only after:

1. the tournament minimum player count is reached;
2. all required players complete My CCSF onboarding;
3. all required players are verified TUT students;
4. the coach requirement is completed where applicable; and
5. tournament rules are accepted.

Priority for the first eight teams is based on `compliance_completed_at`, not team creation time. Administrators retain duplicate-player, fraud and eligibility review authority.

## Community roles

The initial opportunity catalogue includes:

- Campus Ambassador
- Residence Ambassador
- Crime Prevention and Campus Patrol Awareness
- Administration and Office Support
- Marketing and Promotions
- Journalism, Media and Content Creation
- IT and Technical Support
- Sports and Events Volunteer
- General Volunteer

Community patrol participants do not replace CPS, SAPS or emergency responders. They may not confront suspects, search or detain people, investigate active cases or place themselves in danger.

Approval for a community role does not automatically grant access to incident records, student verification documents, administrative consoles or developer tools.

## Media and participation

Students can submit blogs, news tips, podcast ideas, vlog proposals, photos, event coverage, community stories and sports updates. Every submission enters moderation before publication.

My Participation records games, teams, role applications, content submissions, points and badges. Public leaderboard preferences support full name, first name, nickname or hidden display. Student numbers, phone numbers and private records are never leaderboard fields.

## Administration

Community management is available in:

- the official Admin Console;
- the Pilot Super-Admin Console.

The management workspace covers members, applications, games, sports, compliance, moderation, points, notifications, analytics and governance. Community access remains separated from safety-case permissions.

## Data and security

Migration `20260804193000_join_the_community.sql` defines shared official/Pilot tables with an explicit `environment` boundary, row-level security, protected verification records, compliance queue indexing and audit-log structures.

The migration is committed for review but is not applied to production by this pull request.

## Release controls

- `npm run test:community`
- TypeScript type checking
- lint
- Safety Mobility and Safety Quest release gates
- evidence resilience gates
- production build
- Pilot build and existing Pilot routing/review gates

No automatic merge or production publication is authorised.
