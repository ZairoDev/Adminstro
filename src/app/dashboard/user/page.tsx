import React from "react";
import TablePage from "@/app/userTable/page";
import Animation from "@/components/animation";

const UserPage = () => {
  return (
    <div className="lg:mt-0 mt-2">
      <div>
        {/* <Animation> */}
          <TablePage />
        {/* </Animation> */}
      </div>
    </div>
  );
};

export default UserPage;
