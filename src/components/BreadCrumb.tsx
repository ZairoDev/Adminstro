import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
    <Breadcrumb className="text-xs">
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
                  <BreadcrumbPage className="text-xs">{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink>
                    <Link className="text-xs" href={routeTo}>
                      {name}
                    </Link>
                    {/* <CustomTooltip className="text-xs" text={name} desc="Update sortly" /> */}
                    {/* <p className="cursor-pointer">{}</p> */}
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
