import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Ruler, Info } from "lucide-react";
import { useState } from "react";

// Size conversion data
const mensSizes = [
  { us: "6", uk: "5.5", eu: "38.5", cm: "24" },
  { us: "6.5", uk: "6", eu: "39", cm: "24.5" },
  { us: "7", uk: "6.5", eu: "40", cm: "25" },
  { us: "7.5", uk: "7", eu: "40.5", cm: "25.5" },
  { us: "8", uk: "7.5", eu: "41", cm: "26" },
  { us: "8.5", uk: "8", eu: "42", cm: "26.5" },
  { us: "9", uk: "8.5", eu: "42.5", cm: "27" },
  { us: "9.5", uk: "9", eu: "43", cm: "27.5" },
  { us: "10", uk: "9.5", eu: "44", cm: "28" },
  { us: "10.5", uk: "10", eu: "44.5", cm: "28.5" },
  { us: "11", uk: "10.5", eu: "45", cm: "29" },
  { us: "11.5", uk: "11", eu: "45.5", cm: "29.5" },
  { us: "12", uk: "11.5", eu: "46", cm: "30" },
  { us: "12.5", uk: "12", eu: "47", cm: "30.5" },
  { us: "13", uk: "12.5", eu: "47.5", cm: "31" },
];

const womensSizes = [
  { us: "5", uk: "2.5", eu: "35.5", cm: "22" },
  { us: "5.5", uk: "3", eu: "36", cm: "22.5" },
  { us: "6", uk: "3.5", eu: "36.5", cm: "23" },
  { us: "6.5", uk: "4", eu: "37.5", cm: "23.5" },
  { us: "7", uk: "4.5", eu: "38", cm: "24" },
  { us: "7.5", uk: "5", eu: "38.5", cm: "24.5" },
  { us: "8", uk: "5.5", eu: "39", cm: "25" },
  { us: "8.5", uk: "6", eu: "40", cm: "25.5" },
  { us: "9", uk: "6.5", eu: "40.5", cm: "26" },
  { us: "9.5", uk: "7", eu: "41", cm: "26.5" },
  { us: "10", uk: "7.5", eu: "42", cm: "27" },
  { us: "10.5", uk: "8", eu: "42.5", cm: "27.5" },
  { us: "11", uk: "8.5", eu: "43", cm: "28" },
];

const kidsSizes = [
  { us: "10.5K", uk: "10", eu: "28", cm: "17" },
  { us: "11K", uk: "10.5", eu: "28.5", cm: "17.5" },
  { us: "11.5K", uk: "11", eu: "29", cm: "18" },
  { us: "12K", uk: "11.5", eu: "30", cm: "18.5" },
  { us: "12.5K", uk: "12", eu: "30.5", cm: "19" },
  { us: "13K", uk: "12.5", eu: "31", cm: "19.5" },
  { us: "13.5K", uk: "13", eu: "31.5", cm: "20" },
  { us: "1Y", uk: "13.5", eu: "32", cm: "20.5" },
  { us: "1.5Y", uk: "1", eu: "33", cm: "21" },
  { us: "2Y", uk: "1.5", eu: "33.5", cm: "21.5" },
  { us: "2.5Y", uk: "2", eu: "34", cm: "22" },
  { us: "3Y", uk: "2.5", eu: "35", cm: "22.5" },
  { us: "3.5Y", uk: "3", eu: "35.5", cm: "23" },
];

interface SizeGuideModalProps {
  trigger?: React.ReactNode;
}

export function SizeGuideModal({ trigger }: SizeGuideModalProps) {
  const [open, setOpen] = useState(false);

  const SizeTable = ({ sizes, category }: { sizes: typeof mensSizes; category: string }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-3 px-4 text-left font-semibold text-amber-500">US</th>
            <th className="py-3 px-4 text-left font-semibold text-amber-500">UK</th>
            <th className="py-3 px-4 text-left font-semibold text-amber-500">EU</th>
            <th className="py-3 px-4 text-left font-semibold text-amber-500">CM</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((size, index) => (
            <tr 
              key={index} 
              className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900/50' : 'bg-gray-800/30'} hover:bg-amber-500/10 transition-colors`}
            >
              <td className="py-2.5 px-4 font-medium text-white">{size.us}</td>
              <td className="py-2.5 px-4 text-gray-300">{size.uk}</td>
              <td className="py-2.5 px-4 text-gray-300">{size.eu}</td>
              <td className="py-2.5 px-4 text-gray-300">{size.cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Ruler className="h-4 w-4" />
            Size Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Ruler className="h-6 w-6 text-amber-500" />
            Shoe Size Guide
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="mens" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="mens" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              Men's
            </TabsTrigger>
            <TabsTrigger value="womens" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              Women's
            </TabsTrigger>
            <TabsTrigger value="kids" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              Kids
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mens" className="mt-4">
            <SizeTable sizes={mensSizes} category="Men's" />
          </TabsContent>
          
          <TabsContent value="womens" className="mt-4">
            <SizeTable sizes={womensSizes} category="Women's" />
          </TabsContent>
          
          <TabsContent value="kids" className="mt-4">
            <SizeTable sizes={kidsSizes} category="Kids" />
          </TabsContent>
        </Tabs>

        {/* How to Measure Section */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-amber-500" />
            How to Measure Your Foot
          </h3>
          <ol className="space-y-2 text-gray-300 text-sm">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">1.</span>
              Place a piece of paper on a hard floor against a wall.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">2.</span>
              Stand on the paper with your heel against the wall.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">3.</span>
              Mark the longest point of your foot (usually the big toe).
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">4.</span>
              Measure the distance from the wall to the mark in centimeters.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">5.</span>
              Use the CM column in the chart above to find your size.
            </li>
          </ol>
        </div>

        {/* Tips Section */}
        <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <h3 className="text-lg font-semibold text-amber-500 mb-2">Sizing Tips</h3>
          <ul className="space-y-1.5 text-gray-300 text-sm">
            <li>• Measure your feet in the afternoon when they're at their largest.</li>
            <li>• If you're between sizes, we recommend going up half a size.</li>
            <li>• Different brands may fit slightly differently - check product descriptions for specific fit notes.</li>
            <li>• For sneakers, consider leaving about 1cm of space at the toe.</li>
          </ul>
        </div>

        {/* Brand-Specific Notes */}
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Brand Fit Guide</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-900 rounded">
              <span className="font-semibold text-amber-500">Nike</span>
              <p className="text-gray-400 mt-1">Generally true to size. Some models run narrow.</p>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <span className="font-semibold text-amber-500">Adidas</span>
              <p className="text-gray-400 mt-1">Often runs half size small. Consider sizing up.</p>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <span className="font-semibold text-amber-500">Jordan</span>
              <p className="text-gray-400 mt-1">True to size for most models. Retros may vary.</p>
            </div>
            <div className="p-3 bg-gray-900 rounded">
              <span className="font-semibold text-amber-500">New Balance</span>
              <p className="text-gray-400 mt-1">True to size with wider fit options available.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SizeGuideModal;
