import Link from 'next/link';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export const metadata = {
  title: 'Page not found — NollywoodVideo',
  description: 'The page or title you were looking for is not part of the NollywoodVideo catalogue.'
};

export default function NotFound() {
  return (
    <PageShell
      eyebrow="Error 404"
      title="We could not find that title"
      description="The page you followed may have been retired, or the film is no longer licensed for streaming in your region."
    >
      <EmptyState
        title="Nothing streaming at this address"
        description="Double-check the link, or head back to the catalogue — there are fresh Nollywood releases added every week."
        action={
          <div className="cluster">
            <Button as="a" href="/" variant="primary" size="md">
              Back to home
            </Button>
            <Button as="a" href="/browse" variant="secondary" size="md">
              Browse the catalogue
            </Button>
          </div>
        }
      />
      <p>
        Looking for something specific? Try the search box in the header, or open{' '}
        <Link href="/browse">the full catalogue</Link> and filter by genre, release year or language.
      </p>
    </PageShell>
  );
}