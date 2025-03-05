import { CatalogueInterface } from "./page";
import CatalogueCard from "./catalogue-card";

const CatalogueList = ({ catalogues }: { catalogues: CatalogueInterface[] }) => {
  return (
    <div className=" flex flex-col gap-y-4 mt-4">
      <h1 className=" mt-2 text-3xl font-semibold underline">All Catalogues</h1>
      {catalogues?.map((catalogue, index) => (
        <CatalogueCard catalogue={catalogue} key={index} />
      ))}
    </div>
  );
};
export default CatalogueList;
