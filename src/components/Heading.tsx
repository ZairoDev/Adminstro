import React from "react";
interface HeadingProps {
  heading: string;
  subheading: string;
}

const Heading = ({ heading, subheading }: HeadingProps) => {
  return (
    <div className="border-l-4 border-primary pl-2 mb-2 bg-primary/10 sm:inline-block rounded-r-sm ">
      <div className="text-start px-1 ">
        <div className="sm:text-xl text-lg font-semibold">{heading}</div>
        <p className="sm:text-sm text-xs text-muted-foreground">{subheading}</p>
      </div>
    </div>
  );
};
export default Heading;
