import '../../styles/auth-v2.css';
import ShowcasePanel from './ShowcasePanel';

export default function AuthLayout({ headingPrefix, headingEm, lede, children }) {
  return (
    <div className="auth-v2">
      <ShowcasePanel headingPrefix={headingPrefix} headingEm={headingEm} lede={lede} />
      <main className="auth-v2__form-side">
        <div className="auth-v2__help">
          <span>Need a hand?</span>
          <a href="#">Contact HR support</a>
        </div>
        <div className="auth-v2__form-center">
          <div className="auth-v2__form-col">{children}</div>
        </div>
      </main>
    </div>
  );
}
