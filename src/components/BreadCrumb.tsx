// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import React from "react";

// const BreadCrumb = () => {
//   const pathname = usePathname();

//   const pathnames = pathname.split("/").filter((x) => x);

//   return (
//     <>
//       <Link href="/">Home</Link>
//       {pathnames.map((name, index) => {
//         const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
//         const isLast = index === pathnames.length - 1;

//         return (
//           <React.Fragment key={routeTo}>
//             <span>/</span>
//             {isLast ? <span>{name}</span> : <Link href={routeTo}>{name}</Link>}
//           </React.Fragment>
//         );
//       })}
//     </>
//   );
// };

// export default BreadCrumb;

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

const BreadCrumb = () => {
  const pathname = usePathname();
  const pathnames = pathname.split("/").filter((x) => x);

  const isClickable = (name: string) => {
    return name.toLowerCase() !== "home" && name.toLowerCase() !== "dashboard";
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Home</BreadcrumbPage>
        </BreadcrumbItem>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          return (
            <React.Fragment key={routeTo}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !isClickable(name) ? (
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink>
                    <Link href={routeTo}>{name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadCrumb;
