import { TermsContent } from '../components/TermsContent';

/** Public page (no sign-in needed): Kabisa's Terms of Use & Privacy Notice. */
export function TermsView() {
  return (
    <div className="min-h-screen bg-[#f6f4ee] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Kabisa
        </a>
        <h1 className="mt-3 mb-4 text-2xl font-extrabold text-gray-900">Terms of Use &amp; Privacy Notice</h1>
        <TermsContent />
      </div>
    </div>
  );
}
