import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
  const [mode, setMode] = useState("signup");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, login } = useAuth();
  const returnTo =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/") &&
    !location.state.from.startsWith("//")
      ? location.state.from
      : "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  async function onSubmit(data) {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(data.email, data.password, data.displayName);
      } else {
        await login(data.email, data.password);
      }
      navigate(returnTo, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <section className="page auth-page">
      <div className="auth-container">
        <p className="eyebrow">Your account</p>
        <h1>{mode === "signup" ? "Join the collection" : "Welcome back"}</h1>
        <p className="auth-intro">
          Browse freely. Sign in or create an account when you’re ready to
          continue to checkout.
        </p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="displayName">Your name</label>
              <input
                id="displayName"
                autoComplete="name"
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={
                  errors.displayName ? "displayName-error" : undefined
                }
                {...register("displayName", {
                  required: "Enter your name.",
                  minLength: {
                    value: 2,
                    message: "Your name must be at least 2 characters.",
                  },
                })}
              />
              {errors.displayName && (
                <span className="form-error" id="displayName-error">
                  {errors.displayName.message}
                </span>
              )}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email", {
                required: "Enter your email address.",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Enter a valid email address.",
                },
              })}
            />
            {errors.email && (
              <span className="form-error" id="email-error">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "password-error" : "password-hint"
              }
              {...register("password", {
                required: "Enter your password.",
                minLength:
                  mode === "signup"
                    ? {
                        value: 12,
                        message: "Use at least 12 characters.",
                      }
                    : undefined,
                maxLength: {
                  value: 128,
                  message: "Password must be no longer than 128 characters.",
                },
              })}
            />
            {errors.password ? (
              <span className="form-error" id="password-error">
                {errors.password.message}
              </span>
            ) : (
              mode === "signup" && (
                <span className="form-hint" id="password-hint">
                  Use at least 12 characters.
                </span>
              )
            )}
          </div>
          <button
            type="submit"
            className="button button-dark button-block"
            disabled={submitting}
          >
            {submitting
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New to Mavera?"}{" "}
          <button
            className="text-button"
            type="button"
            onClick={() =>
              switchMode(mode === "signup" ? "login" : "signup")
            }
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
        <Link className="text-link auth-back" to="/">
          Continue browsing
        </Link>
      </div>
    </section>
  );
}
