export default function NotFoundPage() {
  return (
    <>
      <div className="bg-gray-800 w-full h-screen">
        <div className="app__modal_wrapper">
          <div className="app__modal_wrapper2">
            <div className="app__modal_wrapper3">
              <div className="modal-body relative p-4">
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="w-full flex-col items-center">
                    <div className="flex justify-center"></div>
                    <div className="flex justify-center">
                      <h1 className="text-base font-light">
                        Error 404: Page not found.
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
