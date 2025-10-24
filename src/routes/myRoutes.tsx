import { createBrowserRouter } from "react-router-dom";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SingUp";
import Polling from "@/components/Polling";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminRoute from "@/routes/AdminRoute";
import PollResult from "@/pages/PollResult";
import ChatBot from "@/components/ChatBot";
import UserPolling from "@/pages/UserPolling";
import Layout from "@/components/Layout";

export const myRoutes = createBrowserRouter([
  {
    path: "/",
    element: <SignIn />,
  },
  {
    path: "/signin",
    element: <SignIn />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/app",
    element: <Layout />,
    children: [
      {
        path: "polling",
        element: <Polling/>,
      },
      {
        path: "user-polls",
        element: <UserPolling/>,
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "admin/poll-result",
        element: (
          <AdminRoute>
            <PollResult/>
          </AdminRoute>
        ),
      },
      {
        path: "chat-bot",
        element: <ChatBot/>,
      },
    ],
  },
]);
