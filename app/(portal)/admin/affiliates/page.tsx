import { AdminEntityPage } from "@/components/AdminEntityPage";
import { affiliates } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Afiliados" description="Clics, conversiones, comisiones, prevención de autoreferidos y retiros ficticios." headers={["Código","Afiliado","Clics","Conversiones","Comisión"]} rows={affiliates.map((a) => [a.code,a.name,a.clicks,a.conversions,money(a.commission)])} stats={[["Afiliados","10"],["Clics","4,281"],["Conversiones","245"],["Comisiones","US$1,842"]]} />; }
