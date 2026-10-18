import { EmptyState } from "./EmptyState";

export function FavoritesPage() {
  return <><div className="portal-title-row"><h1>Xe yêu thích của tôi</h1></div><div className="portal-tabs"><button className="active" type="button">Xe tự lái</button></div><article className="portal-card"><EmptyState image="/assets/portal/empty-favorites.webp" title="Chưa có xe yêu thích" description="Lưu lại những chiếc xe bạn ưng ý để tìm thấy nhanh hơn." action={<a className="button portal-primary" href="/#top">Khám phá xe</a>} /></article></>;
}
