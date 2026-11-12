import { createBrowserRouter } from "react-router";
import { RequireAuth, SiteLayout } from "./components/Layout";
import Account from "./pages/Account";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Notes from "./pages/Notes";
import Signup from "./pages/Signup";
import DeleteAccount from "./pages/legal/DeleteAccount";
import Privacy from "./pages/legal/Privacy";
import Support from "./pages/legal/Support";
import Terms from "./pages/legal/Terms";

// Every page of the web app. Paths are English (they also appear in the store listings and in the mobile app).
// The Worker answers any path that is not /api/* with index.html, so new routes need no server change.
export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      {
        path: "/app",
        element: <RequireAuth />,
        children: [
          { index: true, element: <Notes /> },
          { path: "account", element: <Account /> },
        ],
      },
      // Public pages the App Store / Google Play listings link to (see docs/05-app-store.md, docs/06-google-play.md).
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      { path: "/support", element: <Support /> },
      { path: "/delete-account", element: <DeleteAccount /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
