"use client";

/** Submit button that asks for confirmation before the form is sent. */
export function ConfirmButton({ message, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...rest}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        rest.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
