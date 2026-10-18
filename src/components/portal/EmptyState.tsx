export function EmptyState({ image, title, description, action }: {
  image: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="portal-empty">
      <img src={image} alt="" />
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
