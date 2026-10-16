import type { ReactNode } from 'react';
import { TERMS_VERSION } from '../lib/consent';

/**
 * Kabisa Terms of Use & Privacy Notice (Ol Doinyo Technologies Ltd, Kenya).
 * DRAFT for the free beta — to be reviewed by a Kenyan lawyer before paid plans launch.
 * Bump TERMS_VERSION in lib/consent.ts when this changes materially (everyone is asked again).
 */
export function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      <p className="text-xs text-gray-400">Version {TERMS_VERSION}</p>

      <Section title="1. Who we are">
        Kabisa (kabisa.app) is run by <strong>Ol Doinyo Technologies Ltd</strong>, a company in Kenya (“we”, “us”). By ticking
        “I agree” you accept these Terms. If you don’t accept them, you can’t use Kabisa.
      </Section>

      <Section title="2. The service">
        Kabisa teaches spoken Kenyan Swahili. It is currently <strong>free and in beta</strong>: lessons are still being reviewed,
        may contain mistakes and may change or be removed at any time. Kabisa is a learning aid — please don’t rely on it for
        medical, legal, safety or other important communication.
      </Section>

      <Section title="3. Your account">
        You sign in with Google. You must be 18 or older, or have a parent’s or guardian’s permission. Keep your Google account
        secure — you’re responsible for what happens in your Kabisa account. You can delete your account at any time from your
        profile page.
      </Section>

      <Section title="4. Fair use">
        Use Kabisa for your own learning. Don’t misuse it: no attempts to break, overload or copy the service or its content, and
        nothing unlawful, abusive or offensive in feedback or typed answers. We may suspend accounts that do.
      </Section>

      <Section title="5. What we collect and why">
        <ul className="list-disc pl-5 space-y-1">
          <li>From Google: your name, email address and Google account ID — to sign you in.</li>
          <li>What you tell us: first name, country and how people should address you — to personalise the conversations.</li>
          <li>How you learn: lessons done, scores, mistakes, typed answers and feedback — to track your progress and improve the lessons.</li>
          <li>Your first name and points appear on the level leaderboard other learners see.</li>
        </ul>
        <p className="mt-2">
          To run Kabisa we use service providers who process data for us: Supabase (database and sign-in), Vercel (hosting),
          Anthropic (checking sentences you type in your own words) and text-to-speech providers (reading lesson lines aloud — they
          receive the lesson text, not your personal details). Some of them store data outside Kenya. We don’t sell your data and
          don’t show ads.
        </p>
      </Section>

      <Section title="6. Your data rights">
        We handle personal data in line with Kenya’s Data Protection Act, 2019. You can ask to see, correct or delete your data,
        or object to how we use it, by writing to{' '}
        <a href="mailto:feedback@kabisa.app" className="underline">
          feedback@kabisa.app
        </a>
        . Deleting your account removes your profile, progress and scores. We keep data only as long as your account exists, unless
        the law requires otherwise.
      </Section>

      <Section title="7. Emails (optional)">
        If you leave the box ticked, we’ll email you a summary of your learning, the occasional nudge to keep going and key updates
        to the app. Untick it here or on your profile page at any time — you can still use Kabisa without it.
      </Section>

      <Section title="8. Ownership">
        The lessons, audio, design and the Kabisa name belong to Ol Doinyo Technologies Ltd or its licensors. You may use them for your
        own learning only.
      </Section>

      <Section title="9. No guarantees, limited liability">
        Kabisa is provided “as is”, without guarantees that it is error-free or always available. As far as Kenyan law allows, we
        aren’t liable for indirect losses from using it. Nothing here limits rights you have under Kenyan consumer law.
      </Section>

      <Section title="10. Changes and paid plans">
        Kabisa is free today. If we introduce paid features we’ll tell you first, update these Terms and ask you to accept them
        again — nothing will be charged without your agreement.
      </Section>

      <Section title="11. Law">
        These Terms are governed by the laws of Kenya, and the courts of Kenya have jurisdiction. Questions:{' '}
        <a href="mailto:feedback@kabisa.app" className="underline">
          feedback@kabisa.app
        </a>
        .
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}
