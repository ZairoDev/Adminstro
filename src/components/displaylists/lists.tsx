type Area = {
  name: string;
  metrolane?: string;
  zone?: string;
};

export const DisplayLists = ({
  heading,
  data,
  setOnClose,
}: {
  heading: string; 
  data: Area[];
  setOnClose: Function;
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="relative bg-white text-black dark:bg-stone-950 dark:text-white rounded-2xl shadow-lg w-96 max-h-[80vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={() => setOnClose(false)}
          className="absolute top-2 right-2 text-gray-600 hover:text-white"
        >
          ✕
        </button>

        {/* Heading */}
        <h1 className="text-lg font-semibold text-center p-4 border-b">
          {heading}
        </h1>

        {/* Scrollable List */}
        <ul className="p-4 overflow-y-auto flex-1">
          {data.map((item, index) => (
            <li
              key={index}
              className="flex justify-start gap-2 border-b last:border-none py-2 text-md text-gray-300"
            >
              <h1>{index + 1}.</h1>

              <h1>{item.name}</h1>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
