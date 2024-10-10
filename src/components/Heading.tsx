import React from "react";

interface HeadingProps {
  heading: string;
  subheading: string;
}

const Heading = ({ heading, subheading }: HeadingProps) => {
  return (
    <div className="text-start pb-1">
      <div className="sm:text-xl text-lg font-semibold">
        {heading}
      </div>
      <p className="sm:text-sm text-xs text-muted-foreground">
        {subheading}
      </p>
    </div>
  );
};

export default Heading;
