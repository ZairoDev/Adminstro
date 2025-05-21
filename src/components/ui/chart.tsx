import type React from "react"

export const Chart = ({ children }: { children: React.ReactNode }) => {
  return <div className="chart">{children}</div>
}

export const ChartContainer = ({
  children,
  config,
}: {
  children: React.ReactNode
  config?: any
}) => {
  return <div className="chart-container h-full">{children}</div>
}

export const ChartBar = ({
  data,
  dataKey,
  nameKey,
  fill,
  radius,
}: {
  data: any[]
  dataKey: string
  nameKey: string
  fill: string
  radius: number[]
}) => {
  if (!data || data.length === 0) return null

  const value = data[0][dataKey]
  const name = data[0][nameKey]

  // Calculate a relative height for visualization (max 100px)
  const maxHeight = 100
  const relativeHeight = Math.min(value * 3, maxHeight)

  return (
    <div className="chart-bar relative inline-block mx-1 w-12" title={`${name}: ${value}`}>
      <div
        style={{
          height: `${relativeHeight}px`,
          backgroundColor: fill,
          borderRadius: `${radius[0]}px ${radius[1]}px ${radius[2]}px ${radius[3]}px`,
        }}
      ></div>
      <div
        className="text-xs mt-1 text-center overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ maxWidth: "100%" }}
      >
        {name}
      </div>
    </div>
  )
}

export const ChartGroup = ({ children }: { children: React.ReactNode }) => {
  return <div className="chart-group flex items-end justify-around h-full">{children}</div>
}

export const ChartTooltip = ({ content }: { content: React.ReactNode }) => {
  return <div className="chart-tooltip">{content}</div>
}

export const ChartTooltipContent = ({
  children,
}: {
  children: (props: { payload: any[] | null }) => React.ReactNode
}) => {
  // Create a mock payload for our simplified chart implementation
  const mockPayload = [
    {
      name: "Sample",
      value: 0,
      // Add other properties that might be needed
    },
  ]

  // Call the function with the mock payload to get the React elements
  return <div className="chart-tooltip-content">{children({ payload: mockPayload })}</div>
}

export const ChartTooltipItem = ({ label, value, color }: { label: string; value: string; color: string }) => {
  return (
    <div className="chart-tooltip-item">
      <span style={{ color }}>{label}:</span> {value}
    </div>
  )
}
